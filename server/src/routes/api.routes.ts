import { RequestHandler, Response, Router } from 'express';
import { PlacementController } from '../controllers/placement.controller.ts';
import { HealthController } from '../controllers/health.controller.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.middleware.ts';
import { AuthService } from '../services/auth.service.ts';

const router = Router();

const asyncHandler = (
  handler: (req: AuthenticatedRequest, res: Response) => Promise<unknown>,
): RequestHandler => (req, res, next) => {
  void handler(req as AuthenticatedRequest, res).catch(next);
};

router.get('/health', HealthController.getHealth);

router.post('/auth/login', asyncHandler(PlacementController.login));
router.post('/placement/auth/register', asyncHandler(PlacementController.register));
router.get('/auth/me', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
  const user = await AuthService.getUserById(req.user.userId);
  if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return res.json({ success: true, data: safeUser });
}));

router.get('/placement/profile', requireAuth, requireRole('STUDENT'), asyncHandler(PlacementController.getOwnProfile));
router.put('/placement/profile', requireAuth, requireRole('STUDENT'), asyncHandler(PlacementController.saveOwnProfile));
router.post('/placement/profile/submit', requireAuth, requireRole('STUDENT'), asyncHandler(PlacementController.submitOwnProfile));

router.get('/placement/applications', requireAuth, requireRole('STUDENT'), asyncHandler(PlacementController.listOwnJobApplications));
router.post('/placement/applications', requireAuth, requireRole('STUDENT'), asyncHandler(PlacementController.createJobApplication));
router.get('/placement/applications/faculty', requireAuth, requireRole('FACULTY'), asyncHandler(PlacementController.listFacultyJobApplications));
router.patch('/placement/applications/:id', requireAuth, requireRole('STUDENT'), asyncHandler(PlacementController.updateJobApplication));
router.delete('/placement/applications/:id', requireAuth, requireRole('STUDENT'), asyncHandler(PlacementController.deleteJobApplication));

router.get('/placement/students', requireAuth, requireRole('FACULTY'), asyncHandler(PlacementController.listSubmittedStudents));
router.get('/placement/students/:id', requireAuth, requireRole('FACULTY'), asyncHandler(PlacementController.getSubmittedStudent));
router.get('/placement/activity', requireAuth, requireRole('FACULTY'), asyncHandler(PlacementController.getFacultyActivity));

export default router;
