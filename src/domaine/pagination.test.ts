// src/domaine/pagination.test.ts

import { describe, expect, it } from "vitest";
import { elementsDeLaPage, nombreDePages, pageBornee, pagesAProposer } from "./pagination.ts";

describe("pagination", () => {
  it("compte au moins une page, même pour une liste vide", () => {
    expect(nombreDePages(0, 20)).toBe(1);
    expect(nombreDePages(41, 20)).toBe(3);
  });

  it("ramène la page dans les bornes quand la liste rétrécit", () => {
    expect(pageBornee(7, 3)).toBe(3);
    expect(pageBornee(0, 3)).toBe(1);
  });

  it("découpe la page demandée", () => {
    expect(elementsDeLaPage([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(elementsDeLaPage([1, 2, 3, 4, 5], 3, 2)).toEqual([5]);
  });

  it("propose les pages voisines entre des ellipses", () => {
    expect(pagesAProposer(6, 20)).toEqual([1, "ellipse-debut", 5, 6, 7, "ellipse-fin", 20]);
  });

  it("n'utilise pas d'ellipse pour cacher une seule page", () => {
    expect(pagesAProposer(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(pagesAProposer(1, 3)).toEqual([1, 2, 3]);
    expect(pagesAProposer(1, 1)).toEqual([1]);
  });
});
