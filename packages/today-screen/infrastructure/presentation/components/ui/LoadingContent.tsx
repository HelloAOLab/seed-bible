import {
  Skeleton,
  SkeletonContainer,
} from "@packages/seed-bible/seed-bible/components/Skeleton/Skeleton";
import { Divider } from "./Divider";

export const LoadingContent = () => {
  return (
    <>
      <SkeletonContainer
        label="resume-reading"
        className="today-resume-card today-resume-skeleton"
      >
        <Skeleton shape="line" className="today-resume-skeleton-title" />
        <Skeleton shape="block" className="today-resume-skeleton-content" />
        <Skeleton shape="circle" className="today-resume-skeleton-button" />
      </SkeletonContainer>
      <SkeletonContainer label="bookmarks" className="bookmarks-skeleton">
        <Skeleton shape="line" className="bookmarks-skeleton-title" />
        <SkeletonContainer
          label="bookmarks-buttons"
          className="bookmarks-skeleton-buttons"
        >
          <Skeleton shape="block" className="bookmarks-skeleton-button" />
          <Skeleton shape="block" className="bookmarks-skeleton-button" />
          <Skeleton shape="block" className="bookmarks-skeleton-button" />
          <Skeleton shape="block" className="bookmarks-skeleton-button" />
          <Skeleton shape="block" className="bookmarks-skeleton-button" />
          <Skeleton shape="block" className="bookmarks-skeleton-button" />
        </SkeletonContainer>
      </SkeletonContainer>
      <Divider />
      <SkeletonContainer label="search" className="today-search-skeleton">
        <Skeleton shape="line" className="today-search-skeleton-title" />
        <Skeleton shape="block" className="today-search-skeleton-selector" />
        <Skeleton shape="block" className="today-search-skeleton-searchbar" />
      </SkeletonContainer>
      <Divider />
      <SkeletonContainer
        label="recommended"
        className="today-recommended-skeleton"
      >
        <SkeletonContainer
          label="recommended-header"
          className="today-recommended-skeleton-header"
        >
          <Skeleton shape="line" />
          <Skeleton shape="line" />
        </SkeletonContainer>
        <SkeletonContainer
          label="recommended-content"
          className="today-recommended-skeleton-content"
        >
          <Skeleton shape="line" />
          <Skeleton shape="line" />
          <Skeleton shape="line" />
          <Skeleton shape="block" />
        </SkeletonContainer>
      </SkeletonContainer>
      <Divider />
      <SkeletonContainer label="social" className="today-social-skeleton">
        <Skeleton shape="line" />
        <SkeletonContainer
          label="social-live"
          className="today-social-skeleton-live"
        >
          <div></div>
          <Skeleton shape="line" />
        </SkeletonContainer>
      </SkeletonContainer>
    </>
  );
};
