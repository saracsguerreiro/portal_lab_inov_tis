// Registo de todas as acções disponíveis por RPC. Cada uma verifica permissões dentro do serviço.
import * as ideas from "./ideas";
import * as projects from "./projects";
import * as content from "./content";
import * as admin from "./admin";
import * as account from "./account";
import * as dashboard from "./dashboard";
import type { Ctx } from "./context";

export const services = {
  // públicos
  getPublicStats: content.getPublicStats,
  listProjects: projects.listProjects,
  getProject: projects.getProject,
  listChallenges: content.listChallenges,
  getChallenge: content.getChallenge,
  listContents: content.listContents,
  getContent: content.getContent,
  listPartners: content.listPartners,
  sendContact: content.sendContact,
  getPublicSettings: admin.getPublicSettings,
  submitExternalIdea: ideas.submitExternalIdea,
  getStatusByCode: ideas.getStatusByCode,
  answerByCode: ideas.answerByCode,
  registerExternal: account.registerExternal,
  verifyEmail: account.verifyEmail,
  requestPasswordReset: account.requestPasswordReset,
  // conta
  getMe: account.getMe,
  updateProfile: account.updateProfile,
  changePassword: account.changePassword,
  deleteMyAccount: account.deleteMyAccount,
  exportMyData: account.exportMyData,
  listNotifications: account.listNotifications,
  markNotificationsRead: account.markNotificationsRead,
  listMyIdeas: ideas.listMyIdeas,
  getMyIdea: ideas.getMyIdea,
  editMyIdea: ideas.editMyIdea,
  withdrawMyIdea: ideas.withdrawMyIdea,
  requestDeleteMyIdea: ideas.requestDeleteMyIdea,
  revealAuthorship: ideas.revealAuthorship,
  linkAnonymousIdea: ideas.linkAnonymousIdea,
  sendCreatorMessage: ideas.sendCreatorMessage,
  listMyThreads: ideas.listMyThreads,
  // colaborador
  submitImprovementIdea: ideas.submitImprovementIdea,
  listInternalIdeas: ideas.listInternalIdeas,
  getInternalIdea: ideas.getInternalIdea,
  toggleReaction: ideas.toggleReaction,
  addComment: ideas.addComment,
  moderateComment: ideas.moderateComment,
  supportOverview: admin.supportOverview,
  createSupportRequest: admin.createSupportRequest,
  setSupportStatus: admin.setSupportStatus,
  // gestão
  triageList: ideas.triageList,
  triageIdea: ideas.triageIdea,
  changeIdeaStatus: ideas.changeIdeaStatus,
  assignIdea: ideas.assignIdea,
  sendTeamMessage: ideas.sendTeamMessage,
  requestInfo: ideas.requestInfo,
  routeIdea: ideas.routeIdea,
  markDuplicate: ideas.markDuplicate,
  confirmSimilar: ideas.confirmSimilar,
  decideIdea: ideas.decideIdea,
  saveAssessment: ideas.saveAssessment,
  reanalyzeIdea: ideas.reanalyzeIdea,
  confirmDeleteIdea: ideas.confirmDeleteIdea,
  listManagedProjects: projects.listManagedProjects,
  createProject: projects.createProject,
  projectDraftFromIdea: projects.projectDraftFromIdea,
  updateProject: projects.updateProject,
  changeStage: projects.changeStage,
  recordGate: projects.recordGate,
  recordExit: projects.recordExit,
  acceptTransfer: projects.acceptTransfer,
  changeVisibility: projects.changeVisibility,
  setFeatured: projects.setFeatured,
  listLearningCards: projects.listLearningCards,
  getProjectIntegrations: projects.getProjectIntegrations,
  listAllContent: content.listAllContent,
  saveNews: content.saveNews,
  saveSimpleContent: content.saveSimpleContent,
  setContentStatus: content.setContentStatus,
  saveChallenge: content.saveChallenge,
  savePartner: content.savePartner,
  getCriteria: admin.getCriteria,
  saveCriteria: admin.saveCriteria,
  testCriteria: admin.testCriteria,
  communicationInbox: admin.communicationInbox,
  saveTemplate: admin.saveTemplate,
  listUsers: admin.listUsers,
  setUserRole: admin.setUserRole,
  setUserStatus: admin.setUserStatus,
  getSettings: admin.getSettings,
  saveSettings: admin.saveSettings,
  listAudit: admin.listAudit,
  listOutbox: admin.listOutbox,
  getDashboard: dashboard.getDashboard,
} as const;

export type Services = typeof services;
export type Method = keyof Services;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArgsOf<M extends Method> = Services[M] extends (ctx: Ctx, ...a: infer A) => any ? (A extends [] ? undefined : A[0]) : never;
export type ResultOf<M extends Method> = Awaited<ReturnType<Services[M]>>;

export async function call<M extends Method>(ctx: Ctx, method: M, args: ArgsOf<M>): Promise<ResultOf<M>> {
  const fn = services[method] as unknown as (ctx: Ctx, a: unknown) => Promise<ResultOf<M>>;
  if (!fn) throw new Error(`Acção desconhecida: ${String(method)}`);
  return fn(ctx, args);
}
