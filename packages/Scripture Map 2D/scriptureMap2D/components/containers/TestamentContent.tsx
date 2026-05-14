import { SectionToggle } from "scriptureMap2D.components.containers.SectionToggle";
import { useTestamentContent } from "scriptureMap2D.hooks.useTestamentContent";
import { BooksContainer } from "scriptureMap2D.components.ui.BooksContainer";
import {
  Book,
  type BookProps,
} from "scriptureMap2D.components.containers.Book";
import type { SectionToggleProps } from "scriptureMap2D.components.containers.SectionToggle";

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
}

export const TestamentContent = memo(({ hidden }: TestamentContentProps) => {
  const { itemsData } = useTestamentContent();

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
              <BooksContainer>
                {data.content.map(({ key, ...restOfBookData }) => (
                  <Book key={key} {...restOfBookData} />
                ))}
              </BooksContainer>
            );
        }
      })}
    </div>
  );
});
