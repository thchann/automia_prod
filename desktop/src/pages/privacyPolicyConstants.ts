/**
 * Update these before publishing for Meta App Review.
 *
 * Backend alignment: if the policy promises full removal of DM history when a lead is deleted,
 * ensure the API/database cascade-deletes or otherwise removes related `Message` rows (or keep
 * the softer “contact privacy@” language in PrivacyPolicyPage §10).
 */
export const PRIVACY_EFFECTIVE_DATE = "April 9, 2026";
export const LEGAL_ENTITY_NAME = "AutomiaCars";
export const APP_DISPLAY_NAME = "Automia";
export const PRIVACY_EMAIL = "support@automiacars.com";
export const SUPPORT_EMAIL = "support@automiacars.com";
/** Optional: full postal address for the controller. */
export const BUSINESS_ADDRESS: string | null = null;
