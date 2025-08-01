// Admin actions for user, team, and course management

// User management
export {
  getAllUsers,
  createUser,
  updateUserRole,
  deleteUser,
  generateUserInviteToken,
  verifyUserInviteToken,
  type UserWithDetails,
  type CreateUserParams,
  type UpdateUserRoleParams,
  type DeleteUserParams,
  type GenerateUserInviteParams,
  type UserInviteTokenPayload,
} from './users';

// Team management
export {
  getAllTeams,
  createTeam,
  updateTeamMembers,
  deleteTeam,
  type TeamWithDetails,
  type CreateTeamParams,
  type UpdateTeamMembersParams,
  type DeleteTeamParams,
} from './teams';

// Course management
export {
  getAllCourses,
  getAllEducators,
  createCourse,
  updateCourse,
  deleteCourse,
  type CourseWithDetails,
  type CreateCourseParams,
  type UpdateCourseParams,
  type DeleteCourseParams,
  type EducatorOption,
} from './courses';

// Project management
export {
  getAllProjects,
  deleteProject,
  type ProjectWithDetails,
  type DeleteProjectParams,
} from './projects';