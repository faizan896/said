import { ComposerForm } from "@/components/promise/composer-form";

export const metadata = {
  title: "make a promise — said",
};

export default function NewPromisePage() {
  return (
    <div className="sheet mx-3 mt-2 mb-8 sm:mx-auto sm:mt-6 max-w-xl px-5 py-8 sm:px-10 sm:py-12">
      <ComposerForm />
    </div>
  );
}
