export class RejectCourseCommand {
  constructor(
    public readonly courseId: string,
    public readonly reason?: string,
  ) {}
}
