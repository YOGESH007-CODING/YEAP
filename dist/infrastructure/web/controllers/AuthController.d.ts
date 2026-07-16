import type { Request, Response } from 'express';
export declare class AuthController {
    static register(req: Request, res: Response): Promise<void>;
    static login(req: Request, res: Response): Promise<void>;
    static google(req: Request, res: Response): Promise<void>;
    static refresh(req: Request, res: Response): Promise<void>;
    static logout(req: Request, res: Response): Promise<void>;
    static updateProfile(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=AuthController.d.ts.map