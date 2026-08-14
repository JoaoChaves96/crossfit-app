export class InviteNotFoundError extends Error {
  constructor(token: string) {
    super(`Invite not found for token: ${token}`);
    this.name = 'InviteNotFoundError';
  }
}

export class InviteExpiredError extends Error {
  constructor(token: string) {
    super(`Invite has expired: ${token}`);
    this.name = 'InviteExpiredError';
  }
}

export class InviteRevokedError extends Error {
  constructor(token: string) {
    super(`Invite has been revoked: ${token}`);
    this.name = 'InviteRevokedError';
  }
}

export class InviteAlreadyAcceptedError extends Error {
  constructor(token: string) {
    super(`Invite has already been accepted: ${token}`);
    this.name = 'InviteAlreadyAcceptedError';
  }
}

export class InviteeNotRegisteredError extends Error {
  constructor(email: string) {
    super(`No account exists for ${email}. Please register first.`);
    this.name = 'InviteeNotRegisteredError';
  }
}

export class AthleteAlreadyMemberError extends Error {
  constructor(gymId: string) {
    super(`Athlete is already a member of gym: ${gymId}`);
    this.name = 'AthleteAlreadyMemberError';
  }
}

export class GymNotFoundError extends Error {
  constructor(gymId: string) {
    super(`Gym not found: ${gymId}`);
    this.name = 'GymNotFoundError';
  }
}

export class GymSuspendedError extends Error {
  constructor(gymId: string) {
    super(`Gym is suspended: ${gymId}`);
    this.name = 'GymSuspendedError';
  }
}

export class InviteAlreadyRevokedError extends Error {
  constructor(token: string) {
    super(`Invite has already been revoked: ${token}`);
    this.name = 'InviteAlreadyRevokedError';
  }
}

export class CoachAlreadyStaffError extends Error {
  constructor(gymId: string) {
    super(`This person is already staff at gym: ${gymId}`);
    this.name = 'CoachAlreadyStaffError';
  }
}

/**
 * The authenticated caller is not the person the invite was issued to.
 *
 * The message names neither the invitee nor the gym: answering "this invite
 * belongs to alice@example.com" would turn a guessed link into an address
 * oracle for anyone holding it.
 */
export class InviteNotForCallerError extends Error {
  constructor() {
    super('This invite was issued to a different account.');
    this.name = 'InviteNotForCallerError';
  }
}

export class CoachInvitePendingError extends Error {
  constructor(email: string) {
    super(`A coach invite for ${email} is already pending at this gym`);
    this.name = 'CoachInvitePendingError';
  }
}
