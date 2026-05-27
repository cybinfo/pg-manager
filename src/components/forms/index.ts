// Shared form components for centralized, reusable UI

// Address components
export { AddressInput, PropertyAddressInput } from "./AddressInput"
export type { AddressData } from "./AddressInput"
export { ADDRESS_TYPES } from "@/lib/constants/form-options"

// Multi-entry list component
export { MultiEntryList } from "./MultiEntryList"

// Phone entry
export { PhoneEntry, DEFAULT_PHONE } from "./PhoneEntry"
export type { PhoneData } from "./PhoneEntry"

// Email entry
export { EmailEntry, DEFAULT_EMAIL } from "./EmailEntry"
export type { EmailData } from "./EmailEntry"

// Guardian entry
export { GuardianEntry, DEFAULT_GUARDIAN } from "./GuardianEntry"
export type { GuardianData } from "./GuardianEntry"
export { GUARDIAN_RELATION_TYPES } from "@/lib/constants/form-options"

// ID document entry
export { IdDocumentEntry, DEFAULT_ID_DOCUMENT, ID_DOCUMENT_TYPES, DOCUMENTS_WITH_BACK } from "./IdDocumentEntry"
export type { IdDocumentData } from "./IdDocumentEntry"

// Photo components
export { PhotoGallery, CoverImageUpload } from "./PhotoGallery"
