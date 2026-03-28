/**
 * generateAgentId({ state, district, mandal, village? })
 *
 * If village is NOT passed → MA (Mandal Agent)
 *   KSMLM_MA_YYYYMMDD_State_District_Mandal_XXXXXX
 *
 * If village IS passed → SA (Secretariat Agent)
 *   KSMLM_SA_YYYYMMDD_State_District_Mandal_Village_XXXXXX
 */

function generateAgentId({ village, user } = {}) {
  
  // Priority: User (CSM) > Village exists (SG) > Village missing (AG)
  let prefix = "AG"; // Default: Area Agent (No village)
  if (village) prefix = "SG"; // Sub Agent (Village exists)
  if (user)    prefix = "CSM"; // User / Customer Manager

  // ── Generate Timestamp ────────────────────────────────────────
  const now = new Date();
  const timestamp = 
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

  // ── Random Suffix (3 digits) to prevent collisions ────────────
  const randomSuffix = Math.floor(100 + Math.random() * 900);

  // Example Result: CSM20260328164512942
  return `${prefix}${timestamp}${randomSuffix}`;
}

module.exports = { generateAgentId };


// ── Quick test (remove in production) ────────────────────────────
// MA — no village
