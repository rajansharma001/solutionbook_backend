export class CourseApprovedEvent {
  constructor(
    public readonly courseId: string,
    public readonly courseTitle: string,
    public readonly teacherId: string,
  ) {}
}
