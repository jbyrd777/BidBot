/** The slice of noVNC's viewer the computer screen uses. */
declare module "@novnc/novnc" {
  export default class RFB {
    constructor(target: HTMLElement, url: string, options?: { credentials?: { password?: string } });
    scaleViewport: boolean;
    resizeSession: boolean;
    viewOnly: boolean;
    disconnect(): void;
    addEventListener(event: "connect" | "disconnect" | "credentialsrequired", handler: () => void): void;
  }
}
