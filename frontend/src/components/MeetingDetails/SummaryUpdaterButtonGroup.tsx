"use client";

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Copy, Save, Loader2, FileText, FileDown } from 'lucide-react';
import Analytics from '@/lib/analytics';

interface SummaryUpdaterButtonGroupProps {
  isSaving: boolean;
  isDirty: boolean;
  onSave: () => Promise<void>;
  onCopy: () => Promise<void>;
  onExport: () => Promise<void>;
  isExporting?: boolean;
  onFind?: () => void;
  onOpenFolder: () => Promise<void>;
  hasSummary: boolean;
  exportedFilePath?: string | null;
  onOpenExportedFile?: () => void;
}

export function SummaryUpdaterButtonGroup({
  isSaving,
  isDirty,
  onSave,
  onCopy,
  onExport,
  isExporting = false,
  onFind,
  onOpenFolder,
  hasSummary,
  exportedFilePath,
  onOpenExportedFile
}: SummaryUpdaterButtonGroupProps) {
  return (
    <ButtonGroup>
      <Button
        variant="outline"
        size="sm"
        className={`${isDirty ? 'bg-green-200' : ""}`}
        title={isSaving ? "Saving" : "Save Changes"}
        onClick={() => {
          Analytics.trackButtonClick('save_changes', 'meeting_details');
          onSave();
        }}
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="animate-spin" />
            <span className="hidden lg:inline">Saving...</span>
          </>
        ) : (
          <>
            <Save />
            <span className="hidden lg:inline">Save</span>
          </>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        title="Copy Summary"
        onClick={() => {
          Analytics.trackButtonClick('copy_summary', 'meeting_details');
          onCopy();
        }}
        disabled={!hasSummary}
        className="cursor-pointer"
      >
        <Copy />
        <span className="hidden lg:inline">Copy</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        title={isExporting ? "Exporting" : "Export to Markdown"}
        onClick={() => {
          Analytics.trackButtonClick('export_summary', 'meeting_details');
          onExport();
        }}
        disabled={!hasSummary || isExporting}
        className="cursor-pointer"
      >
        {isExporting ? (
          <>
            <Loader2 className="animate-spin" />
            <span className="hidden lg:inline">Exporting...</span>
          </>
        ) : (
          <>
            <FileDown />
            <span className="hidden lg:inline">Export</span>
          </>
        )}
      </Button>

      {exportedFilePath && onOpenExportedFile && (
        <Button
          variant="outline"
          size="sm"
          title="View Exported Summary File"
          onClick={() => {
            Analytics.trackButtonClick('view_exported_file', 'meeting_details');
            onOpenExportedFile();
          }}
          className="cursor-pointer"
        >
          <FileText />
          <span className="hidden lg:inline">View File</span>
        </Button>
      )}
    </ButtonGroup>
  );
}
