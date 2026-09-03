export class CourseRejectedEvent {
  constructor(
    public readonly courseId: string,
    public readonly courseTitle: string,
    public readonly teacherId: string,
    public readonly reason?: string,
  ) {}
}
