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

export class AthleteNotRegisteredError extends Error {
  constructor(email: string) {
    super(
      `Athlete with email ${email} is not registered. Please register first.`,
    );
    this.name = 'AthleteNotRegisteredError';
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

export class InviteAlreadyRevokedError extends Error {
  constructor(token: string) {
    super(`Invite has already been revoked: ${token}`);
    this.name = 'InviteAlreadyRevokedError';
  }
}
