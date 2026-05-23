export class ClassCancelledEvent {
  constructor(
    public readonly gymId: string,
    public readonly classId: string,
    public readonly classTypeName: string,
    public readonly scheduledDate: string,
    public readonly scheduledTime: string,
    public readonly bookedUserIds: string[],
  ) {}
}
