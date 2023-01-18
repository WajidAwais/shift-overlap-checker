module.exports = function getOverlap(interval1, interval2) {
  interval1 = { startTime: interval1.start_time, endTime: interval1.end_time };
  interval2 = { startTime: interval2.start_time, endTime: interval2.end_time };
  if (
    interval1.startTime < interval2.endTime &&
    interval1.endTime > interval2.startTime
  ) {
    const start = Math.max(interval1.startTime, interval2.startTime);
    const end = Math.min(interval1.endTime, interval2.endTime);
    return (end - start)/60000;
  }
  return 0;
};
