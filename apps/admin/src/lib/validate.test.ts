import { describe, test, expect } from 'bun:test';
import { isValidHexColor, isValidHttpUrlOrEmpty, validateBlockInput, parseReorderIds } from './validate';

describe('isValidHexColor', () => {
  test('válidos', () => {
    expect(isValidHexColor('#0a84ff')).toBe(true);
    expect(isValidHexColor('#FFFFFF')).toBe(true);
  });
  test('inválidos', () => {
    expect(isValidHexColor('red')).toBe(false);
    expect(isValidHexColor('#fff')).toBe(false);
    expect(isValidHexColor('#0a84ff00')).toBe(false);
    expect(isValidHexColor('')).toBe(false);
  });
});

describe('isValidHttpUrlOrEmpty', () => {
  test('vacío permitido', () => {
    expect(isValidHttpUrlOrEmpty('')).toBe(true);
    expect(isValidHttpUrlOrEmpty('  ')).toBe(true);
  });
  test('http/https y mailto', () => {
    expect(isValidHttpUrlOrEmpty('https://example.com')).toBe(true);
    expect(isValidHttpUrlOrEmpty('mailto:a@b.com')).toBe(true);
  });
  test('rechaza otros esquemas', () => {
    expect(isValidHttpUrlOrEmpty('javascript:alert(1)')).toBe(false);
    expect(isValidHttpUrlOrEmpty('ftp://x.com')).toBe(false);
  });
});

describe('validateBlockInput', () => {
  test('bloque link válido', () => {
    const r = validateBlockInput({ type: 'link', title: 'Web', url: 'https://example.com' });
    expect(r.ok).toBe(true);
  });
  test('tipo inválido', () => {
    const r = validateBlockInput({ type: 'banner', url: 'https://example.com' });
    expect(r.ok).toBe(false);
  });
  test('social sin título es válido', () => {
    const r = validateBlockInput({ type: 'social', url: 'https://x.com/edu' });
    expect(r.ok).toBe(true);
  });
  test('link sin título es inválido', () => {
    const r = validateBlockInput({ type: 'link', url: 'https://example.com' });
    expect(r.ok).toBe(false);
  });
  test('sin URL es inválido', () => {
    const r = validateBlockInput({ type: 'link', title: 'Web' });
    expect(r.ok).toBe(false);
  });
  test('URL javascript: es inválida', () => {
    const r = validateBlockInput({ type: 'link', title: 'Web', url: 'javascript:alert(1)' });
    expect(r.ok).toBe(false);
  });
  test('thumbnail inválido es rechazado', () => {
    const r = validateBlockInput({ type: 'promo', title: 'x', url: 'https://a.com', thumbnail_url: 'ftp://img' });
    expect(r.ok).toBe(false);
  });
});

describe('parseReorderIds', () => {
  test('array válido', () => {
    expect(parseReorderIds([3, 1, 2])).toEqual([3, 1, 2]);
  });
  test('rechaza no-arrays', () => {
    expect(parseReorderIds('3,1,2')).toBeNull();
    expect(parseReorderIds({ ids: [1] })).toBeNull();
  });
  test('rechaza duplicados', () => {
    expect(parseReorderIds([1, 2, 2])).toBeNull();
  });
  test('rechaza valores no enteros positivos', () => {
    expect(parseReorderIds([1, -2])).toBeNull();
    expect(parseReorderIds([1, 2.5])).toBeNull();
    expect(parseReorderIds([1, 'x'])).toBeNull();
  });
  test('array vacío es válido', () => {
    expect(parseReorderIds([])).toEqual([]);
  });
});
