import shiftsService from "../Services/ShiftsService";

const Q4to6 = () => {
  return (
    <div className="querysec">
      <button
        className="submit-btn"
        onClick={() => {
          shiftsService.q4().then((data) => {
            console.log(data);
          });
        }}
      >
        Execute Q4 Query
      </button>
      <button
        className="submit-btn"
        onClick={() => {
          shiftsService.q5().then((data) => {
            console.log(data);
          });
        }}
      >
        Execute Q5 Query
      </button>
      <button
        className="submit-btn"
        onClick={() => {
          shiftsService.q6().then((data) => {
            console.log(data);
          });
        }}
      >
        Execute Q6 Query
      </button>
    </div>
  );
};

export default Q4to6;
