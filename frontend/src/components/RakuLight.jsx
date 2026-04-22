import React from "react";

export const RakuLight = ({ size = "default", className = "", "data-testid": testid }) => {
    const sizeClass =
        size === "small"
            ? "small"
            : size === "tiny"
              ? "tiny"
              : size === "large"
                ? "large"
                : "";
    return (
        <div
            className={`raku-light ${sizeClass} ${className}`}
            data-testid={testid || "raku-light"}
            aria-hidden
        >
            {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="block" />
            ))}
        </div>
    );
};

export default RakuLight;
