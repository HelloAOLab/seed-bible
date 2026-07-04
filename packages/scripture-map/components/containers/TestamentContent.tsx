import { SectionToggle } from "./SectionToggle";
import { useTestamentContent } from "../../hooks/useTestamentContent";
import { BooksContainer } from "../ui/BooksContainer";
import { Book, type BookProps } from "./Book";
import type { SectionToggleProps } from "./SectionToggle";

import { memo } from "preact/compat";

export interface BookData extends BookProps {
  key: string;
}

export interface SectionToggleData extends SectionToggleProps {
  type: "sectionToggle";
  key: string;
}

export interface BooksContainerData {
  type: "booksContainer";
  content: BookData[];
}

export type TestamentContentItemData = SectionToggleData | BooksContainerData;

export interface TestamentContentProps {
  hidden: boolean;
  flat?: boolean;
}

export const TestamentContent = memo(
  ({ hidden, flat }: TestamentContentProps) => {
    const { itemsData, flatBooksData } = useTestamentContent();

    if (flat) {
      return (
        <>
          {flatBooksData.map(({ key, ...rest }) => (
            <Book key={key} {...rest} />
          ))}
        </>
      );
    }

    return (
      <div className={`testament-content${hidden ? " hidden" : ""}`}>
        {itemsData.map((data) => {
          switch (data.type) {
            case "sectionToggle":
              return (
                <SectionToggle
                  key={data.key}
                  section={data.section}
                  sectionKey={data.sectionKey}
                  toggleShowSection={data.toggleShowSection}
                  showingContent={data.showingContent}
                  style={data.style}
                />
              );
            case "booksContainer":
              return (
                <BooksContainer key={data.content[0]?.key}>
                  {data.content.map(({ key, ...restOfBookData }) => (
                    <Book key={key} {...restOfBookData} />
                  ))}
                </BooksContainer>
              );
          }
        })}
      </div>
    );
  }
);
