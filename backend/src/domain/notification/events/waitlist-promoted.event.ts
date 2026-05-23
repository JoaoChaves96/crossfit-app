export class WaitlistPromotedEvent {
  constructor(
    public readonly userId: string,
    public readonly gymId: string,
    public readonly classId: string,
    public readonly classTypeName: string,
    public readonly scheduledDate: string,
    public readonly scheduledTime: string,
  ) {}
}
