import {
  ExportPageHeader,
  ExportStats,
  ExportByTypeSection,
  DatabaseExportSection,
  ExportInfoSection,
} from "@/modules/Export/components";

export default function ExportPage() {
  return (
    <div className="space-y-8">
      {/* Page Header - self-contained */}
      <ExportPageHeader />

      {/* Statistics Overview - self-contained */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Data Overview</h3>
        <ExportStats />
      </section>

      {/* Individual Exports - self-contained */}
      <ExportByTypeSection />

      {/* Full Database Backup - self-contained */}
      <DatabaseExportSection />

      {/* Information Section - static */}
      <ExportInfoSection />
    </div>
  );
}
