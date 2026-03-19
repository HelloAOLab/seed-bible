const { useState } = os.appHooks;
const G = globalThis as any;
const { Button, ButtonsCover } = G.Components;

const ChoosingAReadingPlan = ({ goBack }: { goBack: () => void }) => {
  const [readingPlanType, setReadingPlanType] = useState<string | undefined>(
    ReadingPlanTypes.DAY
  );

  const handleReadingPlanTypeChange = (type: string | undefined) => {
    setReadingPlanType(type);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        alignItems: "center",
        padding: "2rem 0",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          flexDirection: "row",
          gap: "1rem",
          padding: "1rem",
        }}
      >
        <h4
          style={{
            width: "100%",
            fontSize: "1.5rem",
            fontWeight: "bold",
            textAlign: "center",
            color: "var(--secondaryColor)",
          }}
        >
          Choosing a Reading Plan
        </h4>
        <div
          onClick={() => handleReadingPlanTypeChange(ReadingPlanTypes.DAY)}
          className={`innerbox-select-readingplan ${
            readingPlanType === ReadingPlanTypes.DAY ? "active" : ""
          }`}
        >
          <h4>Day Based Reading Plan</h4>
          <p>
            This reading plan will be independent of the date. User can start
            reading from any day of the month.
          </p>
        </div>
        <div
          onClick={() => handleReadingPlanTypeChange(ReadingPlanTypes.DATE)}
          className={`innerbox-select-readingplan ${
            readingPlanType === ReadingPlanTypes.DATE ? "active" : ""
          }`}
        >
          <h4>Date Based Reading Plan</h4>
          <p>
            This reading plan will be based on the date. User must begin reading
            from the start date.
          </p>
        </div>
        <p
          style={{
            fontSize: "1rem",
            width: "100%",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          Please select the type of reading plan you want to create. Choose the
          one that best suits your needs.
        </p>
        <ButtonsCover>
          <Button
            onClick={() => {
              G.AfterReadingPlanConfirmAction = undefined;
              goBack();
            }}
            secondary
          >
            <span
              className="material-symbols-outlined"
              style={{
                color: "var(--pageBackground)",
                fontSize: "0.825rem",
                marginRight: "0.5rem",
              }}
            >
              arrow_back
            </span>
            Go back
          </Button>
          <Button
            onClick={() => {
              G.AfterReadingPlanConfirmAction(readingPlanType);
              G.AfterReadingPlanConfirmAction = undefined;
              goBack();
            }}
            secondary
          >
            Continue
            <span
              className="material-symbols-outlined"
              style={{
                color: "var(--pageBackground)",
                fontSize: "0.825rem",
                marginLeft: "0.5rem",
              }}
            >
              arrow_forward
            </span>
          </Button>
        </ButtonsCover>
      </div>
    </div>
  );
};

return ChoosingAReadingPlan;
