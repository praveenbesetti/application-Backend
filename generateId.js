/**
 * generateAgentId({ state, district, mandal, village? })
 *
 * If village is NOT passed → MA (Mandal Agent)
 *   KSMLM_MA_YYYYMMDD_State_District_Mandal_XXXXXX
 *
 * If village IS passed → SA (Secretariat Agent)
 *   KSMLM_SA_YYYYMMDD_State_District_Mandal_Village_XXXXXX
 */

function generateAgentId({ state, district, mandal, village, user } = {}) {
  // ── Validate required fields ──────────────────────────────────
  if (!state)    throw new Error("state is required");
  if (!district) throw new Error("district is required");
  if (!mandal)   throw new Error("mandal is required");

  // ── Agent type logic ──────────────────────────────────────────
  // Priority: User (USR) > Village (SA) > Mandal (MA)
  let agentType = "MA"; 
  if (village) agentType = "SA";
  if (user)    agentType = "USR"; 

  const now   = new Date();
  const date  = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  function formatName(name) {
    return String(name)
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  }

  const random = String(Math.floor(100000 + Math.random() * 900000));

  const parts = [
    "KSMCM",
    agentType,
    date,
    formatName(state),
    formatName(district),
    formatName(mandal),
  ];

  if (village) parts.push(formatName(village));
  parts.push(random);

  return parts.join("_");
}

module.exports = { generateAgentId };


// ── Quick test (remove in production) ────────────────────────────
// MA — no village
