import { getSheetDataAndFetch } from "ext_discover.helper.getSheetDataAndFetch";

export async function handleSheetUrl(
  link: string,
  thisBot?: Record<string, unknown>
): Promise<unknown> {
  const response = await getSheetDataAndFetch({ link }, thisBot);
  return response;
}
