export const InviteCodeFormat = {
  grouped(code: string): string {
    return code.length === 10 ? `${code.slice(0, 4)} ${code.slice(4, 7)} ${code.slice(7)}` : code;
  },
};
