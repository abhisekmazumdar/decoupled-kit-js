import { NextSeo } from 'next-seo';
import { isMultiLanguage } from '../../lib/isMultiLanguage';
import { getPreview } from '../../lib/getPreview';
import {
	getCurrentLocaleStore,
	globalDrupalStateAuthStores,
	globalDrupalStateStores,
} from '../../lib/stores';

import Layout from '../../components/layout';
import { Recipe } from '@pantheon-systems/nextjs-kit';
// This file can safely be removed if the Drupal
// instance is not sourcing Umami data
export default function RecipeTemplate({
	recipe,
	footerMenu,
	hrefLang,
	preview,
}) {
	const {
		title,
		field_media_image,
		field_recipe_category,
		field_ingredients,
		field_recipe_instruction,
		thumbnail,
	} = recipe;
	const imgSrc = field_media_image?.field_media_image?.uri?.url;

	return (
		<Layout preview={preview} footerMenu={footerMenu}>
			<NextSeo
				title="Decoupled Next Drupal Demo"
				description="Generated by create next app."
				languageAlternates={hrefLang || false}
			/>
			<Recipe
				title={title}
				category={field_recipe_category[0].name}
				imageProps={
					imgSrc
						? {
								src: imgSrc,
								alt: thumbnail?.resourceIdObjMeta.alt,
						  }
						: undefined
				}
				ingredients={field_ingredients}
				instructions={field_recipe_instruction.value}
			/>
		</Layout>
	);
}

export async function getServerSideProps(context) {
	const { locales, locale } = context;
	const multiLanguage = isMultiLanguage(locales);
	const lang = context.preview ? context.previewData.previewLang : locale;
	const store = getCurrentLocaleStore(
		lang,
		context.preview ? globalDrupalStateAuthStores : globalDrupalStateStores,
	);

	// handle nested slugs like /recipes/featured
	const slug = `/recipes${context.params.slug
		.map((segment) => `/${segment}`)
		.join('')}`;

	const params =
		'include=field_media_image.field_media_image,field_recipe_category';
	const previewParams =
		context.preview && (await getPreview(context, 'node--recipe', params));

	try {
		const recipe = await store.getObjectByPath({
			objectName: 'node--recipe',
			path: `${multiLanguage ? lang : ''}${slug}`,
			refresh: true,
			res: context.res,
			params: context.preview ? previewParams : params,
		});

		const footerMenu = await store.getObject({
			objectName: 'menu_items--main',
			refresh: true,
			res: context.res,
		});

		if (!recipe) {
			return { props: { footerMenu } };
		}

		const origin = process.env.NEXT_PUBLIC_FRONTEND_URL;
		// Load all the paths for the current recipe.
		const paths = locales.map(async (locale) => {
			const storeByLocales = getCurrentLocaleStore(
				locale,
				context.preview ? globalDrupalStateAuthStores : globalDrupalStateStores,
			);
			const { path } = await storeByLocales.getObject({
				objectName: 'node--recipe',
				id: recipe.id,
				params: context.preview ? previewParams : params,
				refresh: true,
				res: context.res,
			});
			return path;
		});

		// Resolve all promises returned as part of paths
		// and prepare hrefLang.
		const hrefLang = await Promise.all(paths).then((values) => {
			return values.map((value) => {
				return {
					hrefLang: value.langcode,
					href: origin + '/' + value.langcode + value.alias,
				};
			});
		});

		return {
			props: {
				recipe,
				footerMenu,
				hrefLang,
				preview: Boolean(context.preview),
			},
		};
	} catch (error) {
		console.error('Unable to fetch data for recipe: ', error);
		return {
			notFound: true,
		};
	}
}
