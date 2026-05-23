export class ClassModifiedEvent {
  constructor(
    public readonly gymId: string,
    public readonly classId: string,
    public readonly classTypeName: string,
    public readonly changes: string,
    public readonly bookedUserIds: string[],
  ) {}
}
