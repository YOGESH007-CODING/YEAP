import type { Request, Response } from 'express';
type OAuthProviderName = 'google' | 'github';
export declare class AuthController {
    static register(req: Request, res: Response): Promise<void>;
    static resendVerificationCode(req: Request, res: Response): Promise<void>;
    static verifyEmail(req: Request, res: Response): Promise<void>;
    static login(req: Request, res: Response): Promise<void>;
    static oauthStart(provider: OAuthProviderName): (_req: Request, res: Response) => void;
    static oauthCallback(provider: OAuthProviderName): (req: Request, res: Response) => Promise<void>;
    static refresh(req: Request, res: Response): Promise<void>;
    static logout(req: Request, res: Response): Promise<void>;
    static updateProfile(req: Request, res: Response): Promise<void>;
    static beginAccountDeletionReauth(req: Request, res: Response): Promise<void>;
    static deleteAccount(req: Request, res: Response): Promise<void>;
}
export {};
//# sourceMappingURL=AuthController.d.ts.map