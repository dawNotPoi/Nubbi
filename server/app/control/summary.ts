import summary from "@/models/summary";


export const createSummary = async (req) => {
  return summary.create(req).then((data) => {
    return data;
  });
};

export const findSummary = async (req) => {
  return summary.find(req).then((data) => {
    return data;
  });
};

