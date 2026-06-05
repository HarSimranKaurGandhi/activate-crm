<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class PublicAsset
{
    public static function store(UploadedFile $file, string $directory): string
    {
        $directory = trim($directory, '/');
        $targetDirectory = self::baseRoot().DIRECTORY_SEPARATOR.$directory;

        if (! is_dir($targetDirectory)) {
            mkdir($targetDirectory, 0755, true);
        }

        $extension = $file->getClientOriginalExtension();
        $filename = Str::random(40).($extension ? '.'.$extension : '');

        $file->move($targetDirectory, $filename);

        return $directory.'/'.$filename;
    }

    public static function delete(?string $path): void
    {
        $absolutePath = self::absolutePath($path);

        if ($absolutePath && is_file($absolutePath)) {
            @unlink($absolutePath);
        }
    }

    public static function absolutePath(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        $normalizedPath = ltrim((string) $path, '/');

        foreach (self::candidateRoots() as $root) {
            $candidate = rtrim($root, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$normalizedPath;

            if (is_file($candidate)) {
                return $candidate;
            }
        }

        if (str_starts_with($normalizedPath, 'storage/')) {
            $legacyStoragePath = storage_path('app/public/'.substr($normalizedPath, strlen('storage/')));
            if (is_file($legacyStoragePath)) {
                return $legacyStoragePath;
            }
        }

        $legacyStoragePath = storage_path('app/public/'.$normalizedPath);
        if (is_file($legacyStoragePath)) {
            return $legacyStoragePath;
        }

        return null;
    }

    private static function baseRoot(): string
    {
        $configuredRoot = trim((string) env('PUBLIC_UPLOAD_ROOT', ''));

        if ($configuredRoot !== '') {
            return rtrim($configuredRoot, DIRECTORY_SEPARATOR);
        }

        return public_path();
    }

    /**
     * @return array<int, string>
     */
    private static function candidateRoots(): array
    {
        $roots = [self::baseRoot()];

        if (! in_array(public_path(), $roots, true)) {
            $roots[] = public_path();
        }

        return array_values(array_unique(array_filter($roots)));
    }
}
