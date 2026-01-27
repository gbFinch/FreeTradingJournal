import { render, screen } from "@testing-library/react";
import MetricCard from "./index";

describe("MetricCard", () => {
  it("renders label and value", () => {
    render(<MetricCard label="Total P&L" value="$1,234.56" />);

    expect(screen.getByText("Total P&L")).toBeInTheDocument();
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(
      <MetricCard label="Win Rate" value="65%" subtitle="Based on 100 trades" />
    );

    expect(screen.getByText("Based on 100 trades")).toBeInTheDocument();
  });

  it("does not render subtitle when not provided", () => {
    render(<MetricCard label="Win Rate" value="65%" />);

    expect(screen.queryByText(/based on/i)).not.toBeInTheDocument();
  });

  it("applies custom valueClass to value", () => {
    render(
      <MetricCard label="P&L" value="$500" valueClass="text-green-600" />
    );

    const valueElement = screen.getByText("$500");
    expect(valueElement).toHaveClass("text-green-600");
  });
});
