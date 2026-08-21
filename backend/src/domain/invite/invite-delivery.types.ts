/**
 * Whether the invite email went out. Deliberately not persisted: it describes
 * one request, and after that request an invite is just an invite. Adding a
 * column would imply a history the system does not keep.
 */
export type InviteDeliveryStatus = 'sent' | 'failed';
