import GenericService from "./GenericServices";

class ShiftsService extends GenericService {
  getShifts = () => this.get("question_one_shifts");
  checkOverlap = (shift1, shift2) => this.post("overlap", { shift1, shift2 });
  q6 = () => this.get("q6");
  q4 = () => this.get("q4");
  q5 = () => this.get("q5");
}
let shiftsService = new ShiftsService();
export default shiftsService;
