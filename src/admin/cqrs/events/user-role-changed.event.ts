export class UserRoleChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly oldRole: string,
    public readonly newRole: string,
  ) {}
}
