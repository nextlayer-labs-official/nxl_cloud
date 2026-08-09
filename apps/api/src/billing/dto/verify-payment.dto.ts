import { IsNotEmpty } from "class-validator";

export class VerifyPaymentDto {
  @IsNotEmpty()
  razorpayOrderId!: string;

  @IsNotEmpty()
  razorpayPaymentId!: string;

  @IsNotEmpty()
  razorpaySignature!: string;
}
