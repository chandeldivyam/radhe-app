import { Router } from 'express';
import { UserService } from '@services/user.service.js';
import { validateRequest } from '@middlewares/validateRequest.js';
import { addUserSchema, AddUserInput } from '@schemas/user.schema.js';
import { authenticate } from '@middlewares/authenticate.js';

const router = Router();

router.post(
  '/',
  authenticate,
  validateRequest(addUserSchema),
  async (req, res, next) => {
    try {
      const { organizationId } = req.user as { organizationId: string };
      const { email, password } = req.body as AddUserInput;
      const result = await UserService.addUserToOrganization({
        email,
        password,
        organizationId,
      });
      res.status(200).json({ message: 'User added successfully', result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
