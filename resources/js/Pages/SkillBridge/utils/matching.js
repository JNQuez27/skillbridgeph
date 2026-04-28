export const normalizeTag = (value) => (value || "").trim().toLowerCase();

export const normalizeTags = (values = []) => values
  .map((value) => normalizeTag(value))
  .filter(Boolean);

export const parseTagInput = (value) => (value || "")
  .split(",")
  .map((tag) => tag.trim())
  .filter(Boolean);

export const getJobLocation = (job = {}) => {
  if (job.location) return job.location;
  return [job.locationCity, job.locationRegion].filter(Boolean).join(", ");
};

export const calculateMatchScore = (job = {}, candidate = {}) => {
  const verifiedSkills = Array.isArray(candidate.verifiedSkills) ? candidate.verifiedSkills : [];
  const candidateSkills = normalizeTags(verifiedSkills.length > 0 ? verifiedSkills : candidate.skills || []);
  const requiredSkills = normalizeTags(job.requiredSkills || []);
  const preferredSkills = normalizeTags(job.preferredSkills || []);

  const matchedRequired = requiredSkills.filter((skill) => candidateSkills.includes(skill));
  const matchedPreferred = preferredSkills.filter((skill) => candidateSkills.includes(skill));

  let skillScore = 0;
  if (requiredSkills.length > 0) {
    skillScore += (matchedRequired.length / requiredSkills.length) * 60;
  }
  if (preferredSkills.length > 0) {
    skillScore += (matchedPreferred.length / preferredSkills.length) * 25;
  }
  if (requiredSkills.length === 0 && preferredSkills.length === 0) {
    skillScore = candidateSkills.length > 0 ? 50 : 0;
  }

  const candidateLocation = normalizeTag(candidate.location);
  const jobLocationTokens = normalizeTags([job.locationCity, job.locationRegion, job.location]);
  const locationMatch = candidateLocation && jobLocationTokens.some((token) => candidateLocation.includes(token)) ? 10 : 0;

  const candidateExperience = normalizeTag(candidate.experienceLevel || candidate.experience?.level);
  const jobExperience = normalizeTag(job.experienceLevel);
  const experienceMatch = candidateExperience && jobExperience && candidateExperience === jobExperience ? 5 : 0;

  const score = Math.round(Math.min(100, skillScore + locationMatch + experienceMatch));

  return {
    score,
    matchedRequired,
    matchedPreferred,
    locationMatch: locationMatch > 0,
    experienceMatch: experienceMatch > 0,
  };
};
