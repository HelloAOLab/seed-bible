import { SectionToggle } from "scriptureMap.components.containers.SectionToggle";
import { useTestamentContent } from "scriptureMap.hooks.useTestamentContent";
import { BooksContainer } from "scriptureMap.components.ui.BooksContainer";
import { Book, type BookProps } from "scriptureMap.components.containers.Book";
import type { SectionToggleProps } from "scriptureMap.components.containers.SectionToggle";

const { memo } = os.appCompat;

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
