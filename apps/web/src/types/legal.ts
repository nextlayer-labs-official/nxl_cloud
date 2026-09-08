export interface LegalSection {
  id: string;
  title: string;
  body: string;
  /** Optional bullet list rendered under body — most sections are fine as a single paragraph. */
  items?: string[];
}
