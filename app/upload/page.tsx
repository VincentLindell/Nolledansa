import UploadForm from "@/components/UploadForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ladda upp dans – NolleDansa",
};

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ladda upp nolledans</h1>
        <p className="text-gray-500 mt-1">
          Fyll i informationen nedan och dela upp dansen i övningsbara delar.
        </p>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <UploadForm />
      </div>
    </div>
  );
}
