import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ExportInfoSection() {
  return (
    <section>
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">About Exports</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>CSV Files:</strong> Compatible with Excel, Google Sheets,
            and other spreadsheet applications. Best for data analysis and
            reporting.
          </p>
          <p>
            <strong>JSON Backup:</strong> Complete data export in a portable
            format. Ideal for backing up your data or migrating to another
            system.
          </p>
          <p>
            <strong>SQL Backup:</strong> Database dump with INSERT statements.
            Use this to restore your data to a PostgreSQL database.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
