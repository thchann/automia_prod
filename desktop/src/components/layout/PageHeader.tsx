import type { ReactNode } from "react";
import { PAGE_SUMMARY_CLASS, PAGE_TITLE_CLASS } from "@/components/layout/pageTitle";

type PageHeaderProps = {
  title: string;
  summary?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, summary, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
        {summary ? <p className={PAGE_SUMMARY_CLASS}>{summary}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
