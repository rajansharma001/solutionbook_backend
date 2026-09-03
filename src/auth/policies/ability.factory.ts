import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { User } from '@prisma/client';

export type Actions = 
  | 'manage' 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'enroll' 
  | 'complete' 
  | 'submit' 
  | 'grade' 
  | 'publish' 
  | 'verify' 
  | 'moderate';

export type Subjects = 
  | 'Course' 
  | 'Lesson' 
  | 'Module' 
  | 'Quiz' 
  | 'Assignment' 
  | 'Enrollment' 
  | 'Review' 
  | 'Certificate' 
  | 'User' 
  | 'StudyMaterial' 
  | 'Payment' 
  | 'Conversation' 
  | 'LiveClass' 
  | 'AssignmentSubmission'
  | 'UserProgress'
  | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export interface PolicyHandler {
  handle(ability: AppAbility): boolean;
}

export type PolicyHandlerCallback = (ability: AppAbility) => boolean;

@Injectable()
export class AbilityFactory {
  createForUser(user: User & { permissions?: string[] }): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    switch (user.role) {
      case 'ADMIN':
        can('manage', 'all');
        break;

      case 'TEACHER':
        can('create', 'Course');
        can('read', 'Course');
        can('update', 'Course');
        can('delete', 'Course');
        can('publish', 'Course');

        can('create', 'Lesson');
        can('read', 'Lesson');
        can('update', 'Lesson');
        can('delete', 'Lesson');

        can('create', 'Module');
        can('read', 'Module');
        can('update', 'Module');
        can('delete', 'Module');

        can('create', 'Quiz');
        can('read', 'Quiz');
        can('update', 'Quiz');
        can('delete', 'Quiz');

        can('create', 'Assignment');
        can('read', 'Assignment');
        can('update', 'Assignment');
        can('delete', 'Assignment');

        can('read', 'AssignmentSubmission');
        can('grade', 'AssignmentSubmission');

        can('read', 'Enrollment');

        can('read', 'Review');

        can('create', 'Certificate');

        can('create', 'LiveClass');
        can('read', 'LiveClass');
        can('update', 'LiveClass');
        can('delete', 'LiveClass');

        can('create', 'StudyMaterial');
        can('read', 'StudyMaterial');
        can('update', 'StudyMaterial');
        can('delete', 'StudyMaterial');

        can('read', 'Payment');

        break;

      case 'STUDENT':
      default:
        can('read', 'Course');
        can('enroll', 'Course');

        can('read', 'Lesson');
        can('complete', 'Lesson');

        can('read', 'Module');

        can('read', 'Quiz');
        can('submit', 'Quiz');

        can('read', 'Assignment');
        can('submit', 'Assignment');

        can('create', 'Enrollment');
        can('read', 'Enrollment');

        can('create', 'Review');
        can('read', 'Review');
        can('update', 'Review');
        can('delete', 'Review');

        can('read', 'Certificate');

        can('read', 'StudyMaterial');
        can('create', 'Payment');

        can('read', 'User');
        can('update', 'User');

        can('create', 'Payment');
        can('read', 'Payment');

        can('create', 'Conversation');
        can('read', 'Conversation');
        can('update', 'Conversation');

        can('read', 'LiveClass');

        can('create', 'UserProgress');
        can('read', 'UserProgress');
        can('update', 'UserProgress');

        break;
    }

    if (user.permissions && user.permissions.length > 0) {
      for (const permission of user.permissions) {
        const [action, subject] = permission.split(':') as [Actions, Subjects];
        if (action && subject) {
          can(action, subject);
        }
      }
    }

    const ability = build({
      detectSubjectType: (item: object) => (item?.constructor?.name as Subjects) || 'all',
    }) as AppAbility;

    return ability;
  }
}