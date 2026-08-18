// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title Said
/// @notice A minimal, permanent public ledger of promises. No tokens, no staking,
///         no financial incentive — just an immutable record that someone said
///         they'd do something, plus a lightweight social layer (witnesses) on top.
/// @dev "Broken" is never written to storage. A promise's live status is always
///      derived from (deadline, completedAt) at read time via `_statusOf`, so the
///      contract can't get out of sync with the clock and there is one less thing
///      an attacker (or a bug) could corrupt. `status` in the struct only ever
///      stores `Active` or `Kept` — the two states that require a state transition.
contract Said {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    enum PromiseStatus {
        Active,
        Kept,
        Broken
    }

    /// @dev `status` here is the *recorded* status and only ever holds Active or
    ///      Kept. Broken is derived — see `_statusOf`. Keeping this distinction
    ///      lets us store less state while still exposing a simple derived enum
    ///      to callers via `getPromise`.
    struct Promise {
        uint256 id;
        address creator;
        string statement;
        uint256 createdAt;
        uint256 deadline;
        PromiseStatus status; // Active or Kept only; Broken is derived, never stored
        string proofURI;
        uint256 completedAt;
    }

    // ---------------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------------

    /// @notice Maximum length, in bytes, of a promise statement.
    uint256 public constant MAX_STATEMENT_LENGTH = 280;

    /// @notice Maximum length, in bytes, of a proof URI/note submitted on completion.
    uint256 public constant MAX_PROOF_LENGTH = 512;

    /// @notice Deadlines can't be pushed out further than this, to keep the
    ///         product feeling like near-term accountability rather than a
    ///         50-year IOU.
    uint256 public constant MAX_DEADLINE_WINDOW = 3650 days;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    uint256 private _nextId = 1;

    mapping(uint256 => Promise) private _promises;

    /// @dev promiseId => witness address => witnessed?
    mapping(uint256 => mapping(address => bool)) private _hasWitnessed;

    /// @dev promiseId => ordered list of witness addresses, for enumeration.
    mapping(uint256 => address[]) private _witnesses;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event PromiseCreated(
        uint256 indexed id,
        address indexed creator,
        string statement,
        uint256 createdAt,
        uint256 deadline
    );

    event PromiseWitnessed(
        uint256 indexed id,
        address indexed witness,
        uint256 witnessCount,
        uint256 timestamp
    );

    event PromiseCompleted(
        uint256 indexed id,
        address indexed creator,
        string proofURI,
        uint256 completedAt
    );

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error EmptyStatement();
    error StatementTooLong(uint256 length, uint256 max);
    error DeadlineNotInFuture();
    error DeadlineTooFar();
    error PromiseNotFound(uint256 id);
    error NotPromiseCreator(uint256 id, address caller);
    error CannotWitnessOwnPromise(uint256 id);
    error AlreadyWitnessed(uint256 id, address witness);
    error PromiseNotActive(uint256 id);
    error ProofTooLong(uint256 length, uint256 max);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier promiseExists(uint256 id) {
        if (_promises[id].creator == address(0)) revert PromiseNotFound(id);
        _;
    }

    // ---------------------------------------------------------------------
    // Write functions
    // ---------------------------------------------------------------------

    /// @notice Publicly record a promise. Immutable once created — the statement
    ///         and deadline can never be edited.
    /// @param statement What you said you'd do.
    /// @param deadline Unix timestamp (seconds) by which it must be kept. Must be
    ///        strictly in the future and within `MAX_DEADLINE_WINDOW`.
    /// @return id The newly assigned promise id.
    function createPromise(string calldata statement, uint256 deadline)
        external
        returns (uint256 id)
    {
        uint256 len = bytes(statement).length;
        if (len == 0) revert EmptyStatement();
        if (len > MAX_STATEMENT_LENGTH) {
            revert StatementTooLong(len, MAX_STATEMENT_LENGTH);
        }
        if (deadline <= block.timestamp) revert DeadlineNotInFuture();
        if (deadline > block.timestamp + MAX_DEADLINE_WINDOW) {
            revert DeadlineTooFar();
        }

        id = _nextId++;

        _promises[id] = Promise({
            id: id,
            creator: msg.sender,
            statement: statement,
            createdAt: block.timestamp,
            deadline: deadline,
            status: PromiseStatus.Active,
            proofURI: "",
            completedAt: 0
        });

        emit PromiseCreated(id, msg.sender, statement, block.timestamp, deadline);
    }

    /// @notice Publicly attest "I saw you say this." One witness per wallet per
    ///         promise; the creator cannot witness their own promise.
    function witnessPromise(uint256 id) external promiseExists(id) {
        Promise storage p = _promises[id];

        if (msg.sender == p.creator) revert CannotWitnessOwnPromise(id);
        if (_hasWitnessed[id][msg.sender]) {
            revert AlreadyWitnessed(id, msg.sender);
        }

        _hasWitnessed[id][msg.sender] = true;
        _witnesses[id].push(msg.sender);

        emit PromiseWitnessed(id, msg.sender, _witnesses[id].length, block.timestamp);
    }

    /// @notice Mark a promise kept. Only the creator can do this, and only while
    ///         it's still Active (i.e. before its derived status flips to Broken).
    /// @param proofURI Optional free-form proof: a URL, a short note, or a tx
    ///        hash. Purely informational — not verified on-chain in V1.
    function completePromise(uint256 id, string calldata proofURI)
        external
        promiseExists(id)
    {
        Promise storage p = _promises[id];

        if (msg.sender != p.creator) revert NotPromiseCreator(id, msg.sender);
        if (_statusOf(p) != PromiseStatus.Active) revert PromiseNotActive(id);

        uint256 proofLen = bytes(proofURI).length;
        if (proofLen > MAX_PROOF_LENGTH) revert ProofTooLong(proofLen, MAX_PROOF_LENGTH);

        p.status = PromiseStatus.Kept;
        p.proofURI = proofURI;
        p.completedAt = block.timestamp;

        emit PromiseCompleted(id, msg.sender, proofURI, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Read functions
    // ---------------------------------------------------------------------

    /// @notice Fetch a promise with its *live* status (Active/Kept/Broken),
    ///         derived from the clock rather than trusted from storage.
    function getPromise(uint256 id)
        external
        view
        promiseExists(id)
        returns (Promise memory p)
    {
        p = _promises[id];
        p.status = _statusOf(p);
    }

    /// @notice Whether `witness` has already witnessed promise `id`.
    function hasWitnessed(uint256 id, address witness)
        external
        view
        promiseExists(id)
        returns (bool)
    {
        return _hasWitnessed[id][witness];
    }

    /// @notice Number of witnesses on a promise.
    function witnessCount(uint256 id) external view promiseExists(id) returns (uint256) {
        return _witnesses[id].length;
    }

    /// @notice Paginated list of witness addresses for a promise, in the order
    ///         they witnessed.
    function getWitnesses(uint256 id, uint256 offset, uint256 limit)
        external
        view
        promiseExists(id)
        returns (address[] memory page)
    {
        address[] storage all = _witnesses[id];
        if (offset >= all.length) return new address[](0);

        uint256 end = offset + limit;
        if (end > all.length) end = all.length;

        page = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = all[i];
        }
    }

    /// @notice The next id that will be assigned — i.e. total promises created + 1.
    function nextId() external view returns (uint256) {
        return _nextId;
    }

    /// @dev Derives the live status of a promise from its stored fields and the
    ///      current block timestamp. A promise reads as Broken once its deadline
    ///      has passed without having been marked Kept — without ever writing
    ///      that fact to storage.
    function _statusOf(Promise memory p) private view returns (PromiseStatus) {
        if (p.status == PromiseStatus.Kept) return PromiseStatus.Kept;
        if (block.timestamp > p.deadline) return PromiseStatus.Broken;
        return PromiseStatus.Active;
    }
}
