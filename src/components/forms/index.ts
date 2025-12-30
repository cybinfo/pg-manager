// Shared form components for centralized, reusable UI

// Address components
export { AddressInput, PropertyAddressInput, ADDRESS_TYPES } from "./AddressInput"
export type { AddressData } from "./AddressInput"

// Multi-entry list component
export { MultiEntryList } from "./MultiEntryList"

// Phone entry
export { PhoneEntry, DEFAULT_PHONE } from "./PhoneEntry"
export type { PhoneData } from "./PhoneEntry"

// Email entry
export { EmailEntry, DEFAULT_EMAIL } from "./EmailEntry"
export type { EmailData } from "./EmailEntry"

// Guardian entry
export { GuardianEntry, RELATION_TYPES, DEFAULT_GUARDIAN } from "./GuardianEntry"
export type { GuardianData } from "./GuardianEntry"

// ID document entry
export { IdDocumentEntry, ID_DOCUMENT_TYPES, DEFAULT_ID_DOCUMENT } from "./IdDocumentEntry"
export type { IdDocumentData } from "./IdDocumentEntry"

// Photo components
export { PhotoGallery, CoverImageUpload } from "./PhotoGallery"
