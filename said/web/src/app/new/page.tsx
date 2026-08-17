import { ComposerForm } from "@/components/promise/composer-form";

export const metadata = {
  title: "make a promise — said",
};

export default function NewPromisePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-16">
      <ComposerForm />
    </div>
  );
}
