export const selectionOptionsCss = `.selection-contianer {
    position: absolute;
    top: 4rem;
    left: 4rem;
    z-index: 100001;
    padding: 0.25rem 0;
    box-shadow: 0px 1px 4px 0px #0000001A;
    border: 0.5px solid #E7ECF2;
    background-color: var(--pageBackground);
    width: max-content;
    display: flex;
    flex-direction: column;
    max-height: 200px;
    overflow: auto;
    border-radius: 0.5rem;
  }
  
  .selection-option {
    padding: 3px 6px;
    font-family: DM Sans;
    font-weight: 400;
    cursor: pointer;
    font-size: 12px;
    line-height: 100%;
    letter-spacing: 0%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .selection-option:hover {
    background-color: var(--activeTabFill);
  }

  .selection-option-label {
    font-family: Satoshi;
    font-weight: 500;
    padding: 0 2rem;
    font-size: 12px;
    line-height: 100%;
    letter-spacing: 0%;
  }

  .selection-option-loading {
    padding: 0.5rem;
  }`;
