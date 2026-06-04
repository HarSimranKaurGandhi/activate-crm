<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class PublicAsset
{
    public static function store(UploadedFile $file, string $directory): string
    {
        $directory = trim($directory, '/');
        $targetDirectory = public_path($directory);

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

        $publicPath = public_path($normalizedPath);
        if (is_file($publicPath)) {
            return $publicPath;
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
}
