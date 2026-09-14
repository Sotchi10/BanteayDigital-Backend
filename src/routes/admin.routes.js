import { Router } from 'express'
import { approve, getAdminById, listAdmin, publish, reject, removeManaged, setPublication, updateManaged } from '../controllers/report.controller.js'
import { create as createScamCase, list as listScamCases, update as updateScamCase } from '../controllers/scam-case.controller.js'
import { getForAdmin as getAdminScan } from '../controllers/scan.controller.js'
import requireAuth from '../middleware/auth.middleware.js'
import requireRole from '../middleware/role.middleware.js'
import validate from '../middleware/validate.middleware.js'
import { adminReviewSchema, listAdminReportsQuerySchema, publishReportSchema, reportIdParamSchema, reportPublicationSchema, updateManagedReportSchema } from '../validators/report.validator.js'
import { createScamCaseSchema, scamCaseIdParamSchema, updateScamCaseSchema } from '../validators/scam-case.validator.js'
import { scanIdParamSchema } from '../validators/scan.validator.js'
import { create as createDetectionRule, list as listDetectionRules, update as updateDetectionRule } from '../controllers/detection-rule.controller.js'
import { createDetectionRuleSchema, detectionRuleIdParamSchema, updateDetectionRuleSchema } from '../validators/detection-rule.validator.js'
import { auditLogs, dashboard, users } from '../controllers/admin.controller.js'
import { listAuditLogsQuerySchema, listUsersQuerySchema } from '../validators/admin.validator.js'

const router = Router()
router.use(requireAuth, requireRole('ADMIN'))
router.get('/dashboard', dashboard)
router.get('/users', validate(listUsersQuerySchema, 'query'), users)
router.get('/audit-logs', validate(listAuditLogsQuerySchema, 'query'), auditLogs)
router.get('/scam-cases', listScamCases)
router.post('/scam-cases', validate(createScamCaseSchema), createScamCase)
router.patch('/scam-cases/:id', validate({ params: scamCaseIdParamSchema, body: updateScamCaseSchema }), updateScamCase)
router.get('/detection-rules', listDetectionRules)
router.post('/detection-rules', validate(createDetectionRuleSchema), createDetectionRule)
router.patch('/detection-rules/:id', validate({ params: detectionRuleIdParamSchema, body: updateDetectionRuleSchema }), updateDetectionRule)
router.get('/scans/:id', validate(scanIdParamSchema, 'params'), getAdminScan)
router.get('/reports', validate(listAdminReportsQuerySchema, 'query'), listAdmin)
router.get('/reports/:id', validate(reportIdParamSchema, 'params'), getAdminById)
router.patch('/reports/:id', validate({ params: reportIdParamSchema, body: updateManagedReportSchema }), updateManaged)
router.patch('/reports/:id/approve', validate({ params: reportIdParamSchema, body: adminReviewSchema }), approve)
router.patch('/reports/:id/reject', validate({ params: reportIdParamSchema, body: adminReviewSchema }), reject)
router.post('/reports/:id/publish', validate({ params: reportIdParamSchema, body: publishReportSchema }), publish)
router.patch('/reports/:id/publication', validate({ params: reportIdParamSchema, body: reportPublicationSchema }), setPublication)
router.delete('/reports/:id', validate(reportIdParamSchema, 'params'), removeManaged)

export default router
