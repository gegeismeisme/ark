export type InviteFormProps = {
  redeemCode: string;
  setRedeemCode: (value: string) => void;
  redeemLoading: boolean;
  redeemMessage: string | null;
  redeemError: string | null;
  onRedeem: () => void;
};
